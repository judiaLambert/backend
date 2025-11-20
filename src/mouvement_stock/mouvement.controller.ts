import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MouvementStockService } from './mouvement.service';

@Controller('mouvement-stock')
export class MouvementStockController {
  constructor(private readonly service: MouvementStockService) {}

  @Get()
  async getAll() {
    return await this.service.findAll();
  }

@Get('recent')
async getRecent(@Query('limit') limit?: string) {
  return await this.service.getMouvementsRecent(
    limit ? parseInt(limit, 10) : 100
  );}

  @Get('periode')
  async getByPeriod(
    @Query('debut') debut: string,
    @Query('fin') fin: string,
  ) {
    return await this.service.getMouvementsByPeriod(
      new Date(debut),
      new Date(fin),
    );
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.service.findByMateriel(id_materiel);
  }

  @Get('materiel/:id_materiel/evolution')
  async getEvolution(@Param('id_materiel') id_materiel: string) {
    return await this.service.getEvolutionStock(id_materiel);
  }

  @Get('reference/:type_reference/:id_reference')
  async getByReference(
    @Param('type_reference') type_reference: string,
    @Param('id_reference') id_reference: string,
  ) {
    return await this.service.findByReference(type_reference, id_reference);
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.service.getStatistiques();
  }

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    type_mouvement: string;
    quantite_mouvement: number;
    id_reference?: string;
    type_reference?: string;
    prix_unitaire?: number;
    motif?: string;
    utilisateur?: string;
  }) {
    return await this.service.create(body);
  }
}
