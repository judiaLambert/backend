import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { InventaireService } from './inventaire.service';

@Controller('inventaire')  // ✅ Vérifie que c'est bien 'inventaire' (singulier)
export class InventaireController {
  constructor(private readonly inventaireService: InventaireService) {}

  // ✅ 1. Routes spécifiques EN PREMIER
  @Get('statistiques')
  async getStatistiques() {
    return await this.inventaireService.getStatistiques();
  }

  @Get('alertes')
  async getAlertesStockBas() {
    return await this.inventaireService.getAlertesStockBas();
  }

  @Get('materiel/:id_materiel/cump')
  async getCUMP(@Param('id_materiel') id_materiel: string) {
    const cump = await this.inventaireService.getCUMP(id_materiel);
    return {
      id_materiel,
      cump,
      message: `CUMP actuel du matériel ${id_materiel}`,
    };
  }

  @Get('materiel/:id_materiel/valeur')
  async getValeurStock(@Param('id_materiel') id_materiel: string) {
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      throw new NotFoundException(`Aucun inventaire trouvé pour le matériel ${id_materiel}`);
    }
    
    return {
      id_materiel,
      quantite_stock: inventaire.quantite_stock,
      valeur_stock: inventaire.valeur_stock,
      cump: await this.inventaireService.getCUMP(id_materiel),
    };
  }

  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    const inventaire = await this.inventaireService.findByMateriel(id_materiel);
    
    if (!inventaire) {
      throw new NotFoundException(`Aucun inventaire trouvé pour le matériel ${id_materiel}`);
    }
    
    return inventaire;
  }

  // ✅ 2. Route paramétrique :id APRÈS les routes spécifiques
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.inventaireService.findOne(id);
  }

  // ✅ 3. Route générale GET / EN DERNIER
  @Get()
  async findAll() {
    return await this.inventaireService.findAll();
  }

  // ✅ 4. POST/PUT/DELETE
  @Post()
  async create(@Body() body: {
    id_materiel: string;
    quantite_stock: number;
    seuil_alerte: number;
  }) {
    if (!body.id_materiel || body.quantite_stock === undefined || body.seuil_alerte === undefined) {
      throw new BadRequestException('id_materiel, quantite_stock et seuil_alerte sont obligatoires');
    }
    return await this.inventaireService.create(
      body.id_materiel,
      body.quantite_stock,
      body.seuil_alerte
    );
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
