import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { AcquisitionService } from './acquisition.service';

@Controller('acquisition')
export class AcquisitionController {
  constructor(private service: AcquisitionService) {}

  @Post()
  create(
    @Body('id_fournisseur') idFournisseur: string,
    @Body('date_acquisition') dateAcquisition: string,
    @Body('type_acquisition') typeAcquisition: string,
  ) {
    return this.service.create(idFournisseur, new Date(dateAcquisition), typeAcquisition);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('fournisseur/:fournisseurId')
  findByFournisseur(@Param('fournisseurId') fournisseurId: string) {
    return this.service.findByFournisseur(fournisseurId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('id_fournisseur') idFournisseur: string,
    @Body('date_acquisition') dateAcquisition: string,
    @Body('type_acquisition') typeAcquisition: string,
  ) {
    return this.service.update(id, idFournisseur, new Date(dateAcquisition), typeAcquisition);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}