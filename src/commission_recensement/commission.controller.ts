import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { CommissionService } from './commission.service';

@Controller('commission-recensement')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  @Get('statistiques')
  async getStatistiques() {
    return await this.service.getStatistiques();
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
      date_commission: string;
      membre_commission: string;
      president: string;
      lieu_commission: string;
    },
  ) {
    return await this.service.create(
      new Date(body.date_commission),
      body.membre_commission,
      body.president,
      body.lieu_commission,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      date_commission?: string;
      membre_commission?: string;
      president?: string;
      lieu_commission?: string;
    },
  ) {
    return await this.service.update(id, {
      ...body,
      date_commission: body.date_commission ? new Date(body.date_commission) : undefined,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Commission supprimée avec succès' };
  }
}
