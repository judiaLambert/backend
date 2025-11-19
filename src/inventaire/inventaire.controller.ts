import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { InventaireService } from './inventaire.service';

@Controller('inventaire')
export class InventaireController {
  constructor(private readonly inventaireService: InventaireService) {}

  // ⚠️ IMPORTANT : Les routes spécifiques DOIVENT être AVANT les routes avec paramètres génériques

  // Récupérer les alertes de stock bas
  @Get('alertes/stock-bas')
  async getAlertesStockBas() {
    return await this.inventaireService.getAlertesStockBas();
  }

  // Récupérer les statistiques d'inventaire
  @Get('stats/statistiques')
  async getStatistiques() {
    return await this.inventaireService.getStatistiques();
  }

  // Récupérer l'inventaire d'un matériel spécifique
  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.inventaireService.findByMateriel(id_materiel);
  }

  // Récupérer tous les inventaires
  @Get()
  async getAll() {
    return await this.inventaireService.findAll();
  }

  // Récupérer un inventaire par ID (DOIT être après les routes spécifiques)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.inventaireService.findOne(id);
  }

  // Créer un nouvel inventaire (seulement pour matériel durable)
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

  // Approvisionner un matériel (ajouter du stock)
  @Post('materiel/:id_materiel/approvisionner')
  async approvisionner(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { quantite: number },
  ) {
    return await this.inventaireService.approvisionner(id_materiel, body.quantite);
  }

  // Appliquer une attribution (réserver du matériel)
  @Post('materiel/:id_materiel/attribution')
  async appliquerAttribution(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { quantite: number },
  ) {
    return await this.inventaireService.appliquerAttribution(id_materiel, body.quantite);
  }

  // Appliquer un retour de matériel (libérer une réservation)
  @Post('materiel/:id_materiel/retour')
  async appliquerRetour(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { quantite: number },
  ) {
    return await this.inventaireService.appliquerRetour(id_materiel, body.quantite);
  }

  // Mettre à jour la disponibilité suite à un dépannage
  @Post('materiel/:id_materiel/depannage')
  async majDispoSuiteDepannage(
    @Param('id_materiel') id_materiel: string,
    @Body() body: { 
      quantite_pannee: number;
      nouveau_statut: string;
      ancien_statut?: string;
    },
  ) {
    return await this.inventaireService.majDispoSuiteDepannage(
      id_materiel,
      body.quantite_pannee,
      body.nouveau_statut,
      body.ancien_statut,
    );
  }

  // Mettre à jour un inventaire
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

  // Supprimer un inventaire
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.inventaireService.remove(id);
    return { message: 'Inventaire supprimé avec succès' };
  }
}
