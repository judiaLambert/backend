import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { DepartementService } from './departement.service';

@Controller('departement')
export class DepartementController {
  constructor(private service: DepartementService) {}

  @Post()
  create(
    @Body('id_departement') idDepartement: string,
    @Body('num_salle') numSalle: string,
    @Body('id_typedepartement') idTypeDepartement: number,
    @Body('nom_service') nomService: string,
  ) {
    return this.service.create(idDepartement, numSalle, idTypeDepartement, nomService);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id_departement')
  findOne(@Param('id_departement') idDepartement: string) {
    return this.service.findOne(idDepartement);
  }

  @Put(':id_departement')
  update(
    @Param('id_departement') idDepartement: string,
    @Body('num_salle') numSalle: string,
    @Body('id_typedepartement') idTypeDepartement: number,
    @Body('nom_service') nomService: string,
  ) {
    return this.service.update(idDepartement, numSalle, idTypeDepartement, nomService);
  }

  @Delete(':id_departement')
  remove(@Param('id_departement') idDepartement: string) {
    return this.service.remove(idDepartement);
  }
}