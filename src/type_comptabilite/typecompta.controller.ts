import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { TypeComptabiliteService } from './typecompta.service';

@Controller('type-comptabilite')
export class TypeComptabiliteController {
  constructor(private service: TypeComptabiliteService) {}

  @Post()
  create(
    @Body('libelle') libelle: string,
    @Body('seuil') seuil: number
  ) {
    return this.service.create(libelle, seuil);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body('libelle') libelle: string,
    @Body('seuil') seuil: number
  ) {
    return this.service.update(id, libelle, seuil);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
