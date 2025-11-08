import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { DetailApprovisionnementService } from './detailappro.service';

@Controller('detail-approvisionnement')
export class DetailApprovisionnementController {
  constructor(private service: DetailApprovisionnementService) {}

  @Post()
  create(
    @Body('id_materiel') idMateriel: string,
    @Body('id_appro') idAppro: string,
    @Body('quantite_recu') quantiteRecu: number,
    @Body('prix_unitaire') prixUnitaire: number,
    @Body('quantite_total') quantiteTotal: number,
  ) {
    return this.service.create(idMateriel, idAppro, quantiteRecu, prixUnitaire, quantiteTotal);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('approvisionnement/:approId')
  findByApprovisionnement(@Param('approId') approId: string) {
    return this.service.findByApprovisionnement(approId);
  }

  @Get('stats/:approId')
  getStats(@Param('approId') approId: string) {
    return this.service.getStatsByApprovisionnement(approId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('id_materiel') idMateriel: string,
    @Body('id_appro') idAppro: string,
    @Body('quantite_recu') quantiteRecu: number,
    @Body('prix_unitaire') prixUnitaire: number,
    @Body('quantite_total') quantiteTotal: number,
  ) {
    return this.service.update(id, idMateriel, idAppro, quantiteRecu, prixUnitaire, quantiteTotal);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}