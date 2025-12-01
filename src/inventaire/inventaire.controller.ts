import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { InventaireService } from './inventaire.service';

@Controller('inventaire')
export class InventaireController {
  constructor(private readonly inventaireService: InventaireService) {}

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    quantite_stock: number;
    seuil_alerte: number;
  
  }) {
    if (!body.id_materiel || body.quantite_stock === undefined || body.seuil_alerte === undefined) {
      throw new BadRequestException('Tous les champs sont obligatoires');
    }
    return await this.inventaireService.create(
      body.id_materiel,
      body.quantite_stock,
      body.seuil_alerte,
      
    );
  }

  @Get()
  async findAll() {
    return await this.inventaireService.findAll();
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.inventaireService.getStatistiques();
  }

  @Get('alertes')
  async getAlertesStockBas() {
    return await this.inventaireService.getAlertesStockBas();
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.inventaireService.findByMateriel(id_materiel);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.inventaireService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
    quantite_stock?: number;
    quantite_reservee?: number;
    seuil_alerte?: number;
    
  }) {
    return await this.inventaireService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.inventaireService.remove(id);
  }

}
