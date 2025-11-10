import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { DemandeurService } from './demandeur.service';

@Controller('demandeur')
export class DemandeurController {
  constructor(private readonly service: DemandeurService) {}

  @Post()
  create(
    @Body('nom') nom: string,
    @Body('telephone') telephone: string,
    @Body('email') email: string,
    @Body('type_demandeur') type_demandeur: string,
    @Body('id_departement') id_departement: string,
    @Body('id_utilisateur') id_utilisateur: number,
  ) {
    return this.service.create(nom, telephone, email, type_demandeur, id_departement, id_utilisateur);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('by-user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return await this.service.findByUserId(userId);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.service.findByEmail(email);
  }

  @Get('utilisateur/:id_utilisateur')
  findByUtilisateur(@Param('id_utilisateur') id_utilisateur: string) {
    return this.service.findByUtilisateur(parseInt(id_utilisateur, 10));
  }

  @Get(':id_demandeur')
  findOne(@Param('id_demandeur') id_demandeur: string) {
    return this.service.findOne(id_demandeur);
  }

  @Put(':id_demandeur')
  update(
    @Param('id_demandeur') id_demandeur: string,
    @Body('nom') nom: string,
    @Body('telephone') telephone: string,
    @Body('email') email: string,
    @Body('type_demandeur') type_demandeur: string,
    @Body('id_departement') id_departement: string,
    @Body('id_utilisateur') id_utilisateur: number,
  ) {
    return this.service.update(id_demandeur, nom, telephone, email, type_demandeur, id_departement, id_utilisateur);
  }

  @Delete(':id_demandeur')
  remove(@Param('id_demandeur') id_demandeur: string) {
    return this.service.remove(id_demandeur);
  }
}
