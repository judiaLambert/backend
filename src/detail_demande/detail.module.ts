import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DetailDemandeService } from './detail.service';
import { DetailDemande } from './detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetailDemande])],
  controllers: [],
  providers: [DetailDemandeService],
})
export class DetailDemandeModule {}