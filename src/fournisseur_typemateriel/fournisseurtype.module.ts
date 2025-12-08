import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FournisseurTypeMateriel } from './fournisseurtype.entity';
import { FournisseurTypeMaterielService } from './fournisseurtype.service';
import { FournisseurTypeMaterielController } from './fournisseurtype.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FournisseurTypeMateriel])
  ],
  controllers: [FournisseurTypeMaterielController],
  providers: [FournisseurTypeMaterielService],
  exports: [FournisseurTypeMaterielService],
})
export class FournisseurTypeMaterielModule {}