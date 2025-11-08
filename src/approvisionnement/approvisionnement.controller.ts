import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApprovisionnementService } from './approvisionnement.service';

@Controller('approvisionnement')
export class ApprovisionnementController {
  constructor(private service: ApprovisionnementService) {}

  @Post()
  create(
    @Body('date_approvisionnement') dateApprovisionnement: string,
    @Body('recu') recu: string,
    @Body('id_acquisition') idAcquisition: string,
    @Body('note_approvisionnement') noteApprovisionnement: string,
  ) {
    return this.service.create(new Date(dateApprovisionnement), recu, idAcquisition, noteApprovisionnement);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('acquisition/:acquisitionId')
  findByAcquisition(@Param('acquisitionId') acquisitionId: string) {
    return this.service.findByAcquisition(acquisitionId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('date_approvisionnement') dateApprovisionnement: string,
    @Body('recu') recu: string,
    @Body('id_acquisition') idAcquisition: string,
    @Body('note_approvisionnement') noteApprovisionnement: string,
  ) {
    return this.service.update(id, new Date(dateApprovisionnement), recu, idAcquisition, noteApprovisionnement);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}