import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';
import googleMapsConfig from '../config/google-maps.config';

@Module({
  imports: [ConfigModule.forFeature(googleMapsConfig)],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
