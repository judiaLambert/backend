import { Controller, Get, Post, Param, Query, BadRequestException, Body } from '@nestjs/common';
import { GrandLivreService } from './livre.service';
import { GenerationResult } from './livre.types';

@Controller('grand-livre')
export class GrandLivreController {
  constructor(private readonly grandLivreService: GrandLivreService) {}

  // ✅ Liste toutes les lignes du Grand Livre (une par matériel)
  @Get()
  async getAll() {
    return await this.grandLivreService.findAll();
  }

  // ✅ Grand Livre d'un matériel spécifique
  @Get('materiel/:id_materiel')
  async getByMateriel(@Param('id_materiel') id_materiel: string) {
    return await this.grandLivreService.findByMateriel(id_materiel);
  }

  // ✅ Détail d'une ligne spécifique
  @Get(':id_grand_livre')
  async getOne(@Param('id_grand_livre') id_grand_livre: string) {
    return await this.grandLivreService.findOne(id_grand_livre);
  }

  // ✅ Statistiques globales
  @Get('stats/global')
  async getStatistiques() {
    return await this.grandLivreService.getStatistiques();
  }

  // ✅ RÉGÉNÉRATION COMPLÈTE (vide et recrée tout)
  @Post('regenerer/tout')
  async regenererTout(): Promise<GenerationResult> {
    return await this.grandLivreService.regenererTout();
  }

  // ✅ Générer/Mettre à jour pour une période spécifique
  @Post('generer/periode')
  async genererPeriode(@Body() body: { dateDebut: string; dateFin: string }): Promise<GenerationResult> {
    if (!body.dateDebut || !body.dateFin) {
      throw new BadRequestException('Les dates de début et de fin sont obligatoires');
    }
    return await this.grandLivreService.genererGrandLivrePourPeriode(
      new Date(body.dateDebut),
      new Date(body.dateFin),
    );
  }

  // ✅ Générer pour un mois spécifique
  @Post('generer/mois')
  async genererMois(@Body() body: { annee: number; mois: number }): Promise<GenerationResult> {
    if (!body.annee || !body.mois) {
      throw new BadRequestException('Année et mois sont obligatoires');
    }
    if (body.mois < 1 || body.mois > 12) {
      throw new BadRequestException('Le mois doit être entre 1 et 12');
    }
    
    const dateDebut = new Date(body.annee, body.mois - 1, 1);
    const dateFin = new Date(body.annee, body.mois, 0, 23, 59, 59, 999);
    
    return await this.grandLivreService.genererGrandLivrePourPeriode(dateDebut, dateFin);
  }

  // ✅ Générer pour une année spécifique
  @Post('generer/annee')
  async genererAnnee(@Body() body: { annee: number }): Promise<GenerationResult> {
    if (!body.annee) {
      throw new BadRequestException('Année est obligatoire');
    }
    
    const dateDebut = new Date(body.annee, 0, 1);
    const dateFin = new Date(body.annee, 11, 31, 23, 59, 59, 999);
    
    return await this.grandLivreService.genererGrandLivrePourPeriode(dateDebut, dateFin);
  }

  // ✅ Générer pour le mois en cours
  @Post('generer/mois-courant')
  async genererMoisCourant(): Promise<GenerationResult> {
    const now = new Date();
    const dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return await this.grandLivreService.genererGrandLivrePourPeriode(dateDebut, dateFin);
  }

  // ✅ Générer pour l'année en cours
  @Post('generer/annee-courante')
  async genererAnneeCourante(): Promise<GenerationResult> {
    const now = new Date();
    const dateDebut = new Date(now.getFullYear(), 0, 1);
    const dateFin = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    return await this.grandLivreService.genererGrandLivrePourPeriode(dateDebut, dateFin);
  }
}
