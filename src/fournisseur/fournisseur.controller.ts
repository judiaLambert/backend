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
    @Body('nif') nif: string,
    @Body('stat') stat: string,
    @Body('email') email: string
  ) {
    return this.service.create(nom, contact, adresse, nif, stat, email);
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

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('nom') nom: string,
    @Body('contact') contact: string,
    @Body('adresse') adresse: string,
    @Body('nif') nif: string,
    @Body('stat') stat: string,
    @Body('email') email: string
  ) {
    return this.service.update(id, nom, contact, adresse, nif, stat, email);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
