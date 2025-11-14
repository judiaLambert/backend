import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { TypeDepartementService } from './typedep.service';

@Controller('type-departement')
export class TypeDepartementController {
  constructor(private service: TypeDepartementService) {}

  @Post()
  create(@Body('nom') nom: string) {
    return this.service.create(nom);
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
  update(@Param('id') id: string, @Body('nom') nom: string) {
    return this.service.update(id, nom);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
