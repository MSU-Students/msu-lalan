import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto/auth-response.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'msu_lalan_super_secret_jwt_key_2026'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateJwtUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
