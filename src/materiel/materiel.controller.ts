import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { MaterielService } from './materiel.service';

@Controller('materiel')
export class MaterielController {
  constructor(private service: MaterielService) {}

  @Post()
  create(
    @Body('id_etatmateriel') idEtatMateriel: string,
    @Body('id_typemateriel') idTypeMateriel: string,
    @Body('designation') designation: string,
  ) {
    return this.service.create(idEtatMateriel, idTypeMateriel, designation);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('etat/:etatId')
  findByEtat(@Param('etatId') etatId: string) {
    return this.service.findByEtat(etatId);
  }

  @Get('type/:typeId')
  findByType(@Param('typeId') typeId: string) {
    return this.service.findByType(typeId);
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
    @Body('designation') designation: string,
  ) {
    return this.service.update(id, idEtatMateriel, idTypeMateriel, designation);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}