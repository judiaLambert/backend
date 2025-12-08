import { Controller, Get, Param } from '@nestjs/common';
import { FournisseurTypeMaterielService } from './fournisseurtype.service';

@Controller('fournisseur-type-materiel')
export class FournisseurTypeMaterielController {
  constructor(private service: FournisseurTypeMaterielService) {}

  @Get('fournisseur/:id')
  getTypesByFournisseur(@Param('id') id: string) {
    return this.service.getTypesMaterielsByFournisseur(id);
  }

  @Get('statistiques/:id')
  getStatistiquesFournisseur(@Param('id') id: string) {
    return this.service.getStatistiquesFournisseur(id);
  }

  @Get('type-materiel/:id')
  getFournisseursByType(@Param('id') id: string) {
    return this.service.getFournisseursByTypeMateriel(id);
  }
}