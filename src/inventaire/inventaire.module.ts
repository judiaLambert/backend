import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventaireController } from './inventaire.controller';
import { InventaireService } from './inventaire.service';
import { Inventaire } from './inventaire.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inventaire])],
  controllers: [InventaireController],
  providers: [InventaireService],
  exports: [InventaireService],
})
export class InventaireModule {}