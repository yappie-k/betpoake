import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { dbPool, withTransaction } from '../db/connection.js';
import { SmsService } from '../services/sms.service.js';

export async function authRoutes(server: FastifyInstance) {
  // 1. Initial User Registration (Age Verified, Unconfirmed Phone)
  const registerSchema = z.object({
    email: z.string().email(),
    phoneNumber: z.string().min(9),
    password: z.string().min(8),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    nationalId: z.string().min(6).max(10).optional(),
  });

  server.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.format() });
    }

    const { email, phoneNumber, password, dateOfBirth, nationalId } = parseResult.data;

    // Strict Kenyan Age Gate (18+ Mandatory)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return reply.status(403).send({
        error: 'Regulatory Compliance Restriction: You must be at least 18 years of age to register on BetPoake.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await withTransaction(async (client) => {
        const userRes = await client.query(
          `INSERT INTO users (email, phone_number, password_hash, role, status, date_of_birth, kyc_verified)
           VALUES ($1, $2, $3, 'USER', 'PENDING_KYC', $4, FALSE)
           RETURNING id, email, phone_number, role;`,
          [email, phoneNumber, passwordHash, dateOfBirth]
        );

        const newUser = userRes.rows[0];

        // Create zero-balance Ledger Account for User
        await client.query(
          `INSERT INTO ledger_accounts (user_id, asset_type, account_identifier, balance_micro_units, locked_micro_units)
           VALUES ($1, 'KES', $2, 0, 0);`,
          [newUser.id, `USER_WALLET_${newUser.id}`]
        );

        return newUser;
      });

      // Dispatch SMS OTP immediately upon registration
      const smsResult = await SmsService.sendOtp(phoneNumber);

      return reply.status(201).send({
        message: 'Account created. Please verify your phone via the SMS code sent.',
        userId: user.id,
        phoneNumber: user.phone_number,
        mockOtp: smsResult.mockOtp, // Included in sandbox for automated testing
      });
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ error: 'Email or phone number is already registered.' });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // 2. Request / Resend SMS OTP
  server.post('/send-otp', async (request, reply) => {
    const schema = z.object({ phoneNumber: z.string().min(9) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid phone number' });
    }

    const result = await SmsService.sendOtp(parsed.data.phoneNumber);
    return reply.send(result);
  });

  // 3. Verify SMS OTP and Complete KYC Verification
  server.post('/verify-otp', async (request, reply) => {
    const schema = z.object({
      phoneNumber: z.string().min(9),
      otp: z.string().length(6),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid payload. 6-digit OTP required.' });
    }

    const { phoneNumber, otp } = parsed.data;

    // Validate OTP against Redis
    const isValid = await SmsService.verifyOtp(phoneNumber, otp);
    if (!isValid) {
      return reply.status(400).send({ error: 'Invalid or expired SMS verification code.' });
    }

    // Flip user status to KYC Verified in PostgreSQL
    const res = await dbPool.query(
      `UPDATE users 
       SET kyc_verified = TRUE, status = 'ACTIVE' 
       WHERE phone_number = $1 OR phone_number LIKE '%' || $2
       RETURNING id, email, phone_number, role, kyc_verified;`,
      [phoneNumber, phoneNumber.slice(-9)]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'User with this phone number not found.' });
    }

    const user = res.rows[0];
    const token = server.jwt.sign({ id: user.id, role: user.role });

    return reply.send({
      success: true,
      message: 'Phone KYC verified successfully. Your account is active.',
      token,
      user,
    });
  });

  // 4. User Login
  server.post('/login', async (request, reply) => {
    const loginSchema = z.object({
      identifier: z.string(),
      password: z.string(),
    });

    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid login parameters' });
    }

    const { identifier, password } = parsed.data;

    const res = await dbPool.query(
      `SELECT u.id, u.email, u.phone_number, u.password_hash, u.role, u.status, u.kyc_verified,
              la.balance_micro_units
       FROM users u
       LEFT JOIN ledger_accounts la ON la.user_id = u.id
       WHERE u.email = $1 OR u.phone_number = $1`,
      [identifier]
    );

    if (res.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    const user = res.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return reply.status(401).send({ error: 'Invalid credentials.' });
    }

    if (!user.kyc_verified) {
      // Trigger a new OTP if user tries to login while unverified
      await SmsService.sendOtp(user.phone_number);
      return reply.status(403).send({
        error: 'Phone number unverified. A new 6-digit SMS code has been sent to complete KYC.',
        requiresOtp: true,
        phoneNumber: user.phone_number,
      });
    }

    const token = server.jwt.sign({ id: user.id, role: user.role });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        kycVerified: user.kyc_verified,
        balanceMicroUnits: user.balance_micro_units,
      },
    });
  });
}
