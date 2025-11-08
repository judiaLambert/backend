import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { InventaireService } from './inventaire.service';

@Controller('inventaire')
export class InventaireController {
  constructor(private readonly inventaireService: InventaireService) {}

  @Get()
  async getAll() {
    return await this.inventaireService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.inventaireService.findOne(id);
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.inventaireService.findByMateriel(id_materiel);
  }

  @Post()
  async create(@Body() body: {
    id_materiel: string;
    quantite_stock: number;
    seuil_alerte: number;
    emplacement: string;
  }) {
    return await this.inventaireService.create(
      body.id_materiel,
      body.quantite_stock,
      body.seuil_alerte,
      body.emplacement,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      quantite_stock?: number;
      quantite_reservee?: number;
      seuil_alerte?: number;
      emplacement?: string;
    },
  ) {
    return await this.inventaireService.update(id, body);
  }

  @Put('materiel/:id_materiel/reserve')
  async updateReserve(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { quantite_reservee: number },
  ) {
    return await this.inventaireService.updateQuantiteReservee(id_materiel, body.quantite_reservee);
  }

  @Put('materiel/:id_materiel/stock')
  async updateStock(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { quantite_stock: number },
  ) {
    return await this.inventaireService.updateQuantiteStock(id_materiel, body.quantite_stock);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.inventaireService.remove(id);
    return { message: 'Inventaire supprimé' };
  }

  @Get('alertes/stock-bas')
  async getAlertesStockBas() {
    return await this.inventaireService.getAlertesStockBas();
  }

  @Get('stats/statistiques')
  async getStatistiques() {
    return await this.inventaireService.getStatistiques();
  }
}