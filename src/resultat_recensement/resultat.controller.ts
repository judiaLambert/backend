import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ResultatRecensementService } from './resultat.service';

@Controller('resultat-recensement')
export class ResultatRecensementController {
  constructor(private readonly service: ResultatRecensementService) {}

  @Get('statistiques')
  async getStatistiques() {
    return await this.service.getStatistiques();
  }

  @Get('commission/:id_commission')
  async getByCommission(@Param('id_commission') id_commission: string) {
    return await this.service.findByCommission(id_commission);
  }

  @Get()
  async findAll() {
    return await this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @Post()
  async create(
    @Body()
    body: {
      id_commission: string;
      id_inventaire: string;
      quantite_physique: number;
      type_recensement: string;
      date_recensement: string;
      description_ecart?: string;
    },
  ) {
    return await this.service.create(
      body.id_commission,
      body.id_inventaire,
      body.quantite_physique,
      body.type_recensement,
      new Date(body.date_recensement),
      body.description_ecart,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      quantite_physique?: number;
      description_ecart?: string;
      statut_correction?: string;
    },
  ) {
    return await this.service.update(id, body);
  }

  @Put(':id/valider')
  async valider(@Param('id') id: string) {
    return await this.service.valider(id);
  }

  @Put(':id/rejeter')
  async rejeter(@Param('id') id: string) {
    return await this.service.rejeter(id);
  }

  @Put(':id/corriger')
  async corriger(@Param('id') id: string, @Body() body: { corrige_par: string }) {
    return await this.service.appliquerCorrection(id, body.corrige_par);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Résultat supprimé avec succès' };
  }
}
