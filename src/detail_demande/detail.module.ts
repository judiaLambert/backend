import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailDemandeController } from './detail.controller';
import { DetailDemandeService } from './detail.service';
import { DetailDemande } from './detail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DetailDemande])],
  controllers: [DetailDemandeController],
  providers: [DetailDemandeService],
})
export class DetailDemandeModule {}