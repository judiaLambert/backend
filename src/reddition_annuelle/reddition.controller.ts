import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { RedditionAnnuelleService } from './reddition.service';
import { StatutReddition } from './reddition.entity';
import { GenerationRedditionResult } from './reddition.types';

@Controller('reddition-annuelle')
export class RedditionAnnuelleController {
  constructor(private readonly redditionService: RedditionAnnuelleService) {}

  @Post('generer/:annee')
  async genererAutomatique(@Param('annee') annee: number): Promise<GenerationRedditionResult> {
    const anneeNum = Number(annee);
    if (!anneeNum || anneeNum < 2000 || anneeNum > 2100) {
      throw new BadRequestException('Année invalide');
    }
    return await this.redditionService.genererRedditionAutomatique(anneeNum);
  }

  @Get()
  async findAll() {
    return await this.redditionService.findAll();
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.redditionService.getStatistiques();
  }

  @Get('en-attente')
  async getEnAttente() {
    return await this.redditionService.getEnAttente();
  }

  @Get('statut/:statut')
  async getByStatut(@Param('statut') statut: StatutReddition) {
    return await this.redditionService.findByStatut(statut);
  }

  @Get('annee/:annee')
  async getByAnnee(@Param('annee') annee: number) {
    return await this.redditionService.findByAnnee(annee);
  }

  @Get(':id/detail')
  async getDetailComplet(@Param('id') id: string) {
    return await this.redditionService.getDetailComplet(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.redditionService.findOne(id);
  }

  @Post(':id/valider')
  async valider(@Param('id') id: string) {
    return await this.redditionService.valider(id);
  }

  @Post(':id/rejeter')
  async rejeter(
    @Param('id') id: string,
    @Body() body: { motif_rejet: string }
  ) {
    if (!body.motif_rejet) {
      throw new BadRequestException('Le motif de rejet est obligatoire');
    }
    return await this.redditionService.rejeter(id, body.motif_rejet);
  }
}
