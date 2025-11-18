import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { MaterielService } from './materiel.service';
import { CategorieMateriel } from './materiel.entity';

@Controller('materiel')
export class MaterielController {
  constructor(private service: MaterielService) {}

  @Post()
  create(
    @Body('id_etatmateriel') idEtatMateriel: string,
    @Body('id_typemateriel') idTypeMateriel: string,
    @Body('id_typecomptabilite') idTypeComptabilite: string,
    @Body('designation') designation: string,
    @Body('categorie_materiel') categorie: CategorieMateriel
  ) {
    return this.service.create(
      idEtatMateriel, 
      idTypeMateriel, 
      idTypeComptabilite, 
      designation, 
      categorie
    );
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('categorie/:categorie')
  findByCategorie(@Param('categorie') categorie: CategorieMateriel) {
    return this.service.findByCategorie(categorie);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('id_etatmateriel') idEtatMateriel: string,
    @Body('id_typemateriel') idTypeMateriel: string,
    @Body('id_typecomptabilite') idTypeComptabilite: string,
    @Body('designation') designation: string,
    @Body('categorie_materiel') categorie: CategorieMateriel
  ) {
    return this.service.update(
      id, 
      idEtatMateriel, 
      idTypeMateriel, 
      idTypeComptabilite, 
      designation, 
      categorie
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
