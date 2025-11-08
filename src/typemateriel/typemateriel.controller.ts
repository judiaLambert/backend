import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { TypeMaterielService } from './typemateriel.service';

@Controller('type-materiel')
export class TypeMaterielController {
  constructor(private service: TypeMaterielService) {}

  @Post()
  create(
    @Body('designation') designation: string,
    @Body('description') description: string,
  ) {
    return this.service.create(designation, description);
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
    @Body('designation') designation: string,
    @Body('description') description: string,
  ) {
    return this.service.update(id, designation, description);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}