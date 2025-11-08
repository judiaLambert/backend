import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { DetailDemandeService } from './detail.service';

@Controller('detail-demande')
export class DetailDemandeController {
  constructor(private readonly detailDemandeService: DetailDemandeService) {}

  @Get()
  async getAll() {
    return await this.detailDemandeService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.detailDemandeService.findOne(id);
  }

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    id_demande: string;
    quantite_demander: number;
  }) {
    return await this.detailDemandeService.create(
      body.id_materiel,
      body.id_demande,
      body.quantite_demander
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      id_materiel: string;
      id_demande: string;
      quantite_demander: number;
    },
  ) {
    return await this.detailDemandeService.update(
      id,
      body.id_materiel,
      body.id_demande,
      body.quantite_demander
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.detailDemandeService.remove(id);
    return { message: 'Détail demande supprimé' };
  }
}