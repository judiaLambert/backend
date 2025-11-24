import { Controller, Get, Post, Param, Query, BadRequestException, Body } from '@nestjs/common';
import { GrandLivreService } from './livre.service';
import { GenerationResult } from './livre.types'; 

@Controller('grand-livre')
export class GrandLivreController {
  constructor(private readonly grandLivreService: GrandLivreService) {}

  @Get()
  async getAll() {
    return await this.grandLivreService.findAll();
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.grandLivreService.getStatistiques();
  }

  @Get('soldes')
  async getSoldesParTypeMateriel() {
    return await this.grandLivreService.getSoldesParTypeMateriel();
  }

  @Get('type-materiel/:id_type_materiel')
  async getByTypeMateriel(@Param('id_type_materiel') id_type_materiel: string) {
    return await this.grandLivreService.findByTypeMateriel(id_type_materiel);
  }

  @Get('type-materiel/:id_type_materiel/solde')
  async getSoldeActuel(@Param('id_type_materiel') id_type_materiel: string) {
    return await this.grandLivreService.getSoldeActuel(id_type_materiel);
  }

  @Get('periode')
  async getByPeriode(
    @Query('debut') debut: string,
    @Query('fin') fin: string,
  ) {
    if (!debut || !fin) {
      throw new BadRequestException('Les paramètres debut et fin sont obligatoires');
    }
    return await this.grandLivreService.findByPeriode(new Date(debut), new Date(fin));
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.grandLivreService.findOne(id);
  }

  @Post('generer/mois-courant')
  async genererMoisCourant(): Promise<GenerationResult> { // ✅ Typage explicite
    return await this.grandLivreService.genererGrandLivreMoisCourant();
  }

  @Post('generer/annee-courante')
  async genererAnneeCourante(): Promise<GenerationResult> { // ✅ Typage explicite
    return await this.grandLivreService.genererGrandLivreAnneeCourante();
  }

  @Post('generer/mois')
  async genererMois(@Body() body: { annee: number; mois: number }): Promise<GenerationResult> { // ✅ Typage explicite
    if (!body.annee || !body.mois) {
      throw new BadRequestException('Année et mois sont obligatoires');
    }
    if (body.mois < 1 || body.mois > 12) {
      throw new BadRequestException('Le mois doit être entre 1 et 12');
    }
    return await this.grandLivreService.genererGrandLivreMois(body.annee, body.mois);
  }

  @Post('generer/annee')
  async genererAnnee(@Body() body: { annee: number }): Promise<GenerationResult> { // ✅ Typage explicite
    if (!body.annee) {
      throw new BadRequestException('Année est obligatoire');
    }
    return await this.grandLivreService.genererGrandLivreAnnee(body.annee);
  }

  @Post('generer/periode')
  async genererPeriode(@Body() body: { dateDebut: string; dateFin: string }): Promise<GenerationResult> { // ✅ Typage explicite
    if (!body.dateDebut || !body.dateFin) {
      throw new BadRequestException('Les dates de début et de fin sont obligatoires');
    }
    return await this.grandLivreService.genererGrandLivrePourPeriode(
      new Date(body.dateDebut),
      new Date(body.dateFin),
    );
  }
}
