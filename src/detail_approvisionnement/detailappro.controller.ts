import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { DetailApprovisionnementService } from './detailappro.service';

@Controller('detail-approvisionnement')
export class DetailApprovisionnementController {
  constructor(private service: DetailApprovisionnementService) {}

  // Routes spécifiques EN PREMIER
  @Get('stats/:approId')
  getStats(@Param('approId') approId: string) {
    return this.service.getStatsByApprovisionnement(approId);
  }

  @Get('materiel/:id_materiel/total-recu')
  async getTotalRecuByMateriel(@Param('id_materiel') id_materiel: string) {
    const total = await this.service.getTotalQuantiteRecuByMateriel(id_materiel);
    return { total };
  }

  @Get('approvisionnement/:approId')
  findByApprovisionnement(@Param('approId') approId: string) {
    return this.service.findByApprovisionnement(approId);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: {
    id_materiel: string;
    id_appro: string;
    quantite_recu: number;
    prix_unitaire: number;
    quantite_total?: number;
  }) {
    return this.service.create(
      body.id_materiel,
      body.id_appro,
      body.quantite_recu,
      body.prix_unitaire,
      body.quantite_total,
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      id_materiel: string;
      id_appro: string;
      quantite_recu: number;
      prix_unitaire: number;
      quantite_total?: number;
    }
  ) {
    return this.service.update(
      id,
      body.id_materiel,
      body.id_appro,
      body.quantite_recu,
      body.prix_unitaire,
      body.quantite_total,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
