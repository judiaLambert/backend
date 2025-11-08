import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { FournisseurService } from './fournisseur.service';

@Controller('fournisseur')
export class FournisseurController {
  constructor(private service: FournisseurService) {}

  @Post()
  create(
    @Body('nom') nom: string,
    @Body('contact') contact: string,
    @Body('adresse') adresse: string,
    @Body('id_typemateriel') idTypeMateriel: string,
    @Body('date_livraison') dateLivraison: string,
  ) {
    return this.service.create(nom, contact, adresse, idTypeMateriel, new Date(dateLivraison));
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('groupes')
  findGroupes() {
    return this.service.getFournisseursGroupes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('nom/:nom')
  findByNom(@Param('nom') nom: string) {
    return this.service.findByNom(nom);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('nom') nom: string,
    @Body('contact') contact: string,
    @Body('adresse') adresse: string,
    @Body('id_typemateriel') idTypeMateriel: string,
    @Body('date_livraison') dateLivraison: string,
  ) {
    return this.service.update(id, nom, contact, adresse, idTypeMateriel, new Date(dateLivraison));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}