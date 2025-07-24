import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
<<<<<<< Updated upstream
import { Strategy, StrategyOptions, VerifyCallback } from 'passport-google-oauth20';
=======
import { Strategy, VerifyCallback, StrategyOptions } from 'passport-google-oauth20'; // Add StrategyOptions import
>>>>>>> Stashed changes
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/redirect',
      scope: ['email', 'profile'],
<<<<<<< Updated upstream
    } as StrategyOptions); // ✅ casteo explícito para evitar error TS2345
=======
    } as StrategyOptions);
>>>>>>> Stashed changes
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos, id } = profile;
    const user = {
      email: emails?.[0]?.value, // Add optional chaining for safety
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      googleId: id,
      accessToken,
    };
    done(null, user);
  }
}