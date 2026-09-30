import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', 'placeholder-google-client-id'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', 'placeholder-google-client-secret'),
      callbackURL: configService.get<string>(
        'GOOGLE_CALLBACK_URL',
        'http://localhost:3001/api/v1/auth/google/callback',
      ),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        throw new UnauthorizedException('No email provided by Google account');
      }

      const firstName = profile.name?.givenName || '';
      const lastName = profile.name?.familyName || '';
      const avatarUrl = profile.photos?.[0]?.value || '';
      const googleId = profile.id;

      const user = await this.authService.validateOrCreateGoogleUser({
        googleId,
        email,
        firstName,
        lastName,
        avatarUrl,
      });

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
