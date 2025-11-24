import { Controller, Get, Post, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { JournalService } from './journal.service';
import { StatutValidation } from './journal.entity';

@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  async getAll() {
    return await this.journalService.findAll();
  }

  @Get('en-attente')
  async getEnAttente() {
    return await this.journalService.getEnAttente();
  }

  @Get('statut/:statut')
  async getByStatut(@Param('statut') statut: string) {
    if (!Object.values(StatutValidation).includes(statut as StatutValidation)) {
      throw new BadRequestException(
        `Statut invalide. Valeurs acceptées: ${Object.values(StatutValidation).join(', ')}`
      );
    }
    return await this.journalService.findByStatut(statut as StatutValidation);
  }

  @Get('periode')
  async getByPeriode(
    @Query('debut') debut: string,
    @Query('fin') fin: string,
  ) {
    if (!debut || !fin) {
      throw new BadRequestException('Les paramètres debut et fin sont obligatoires');
    }
    return await this.journalService.findByPeriode(new Date(debut), new Date(fin));
  }

  @Get('statistiques')
  async getStatistiques() {
    return await this.journalService.getStatistiques();
  }

  @Get(':id/detail')
  async getDetailComplet(@Param('id') id: string) {
    return await this.journalService.getDetailComplet(id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return await this.journalService.findOne(id);
  }

  @Post(':id/valider')
  async valider(
    @Param('id') id: string,
    @Body() body: { id_validateur: string }
  ) {
    if (!body.id_validateur) {
      throw new BadRequestException('id_validateur est obligatoire');
    }
    return await this.journalService.valider(id, body.id_validateur);
  }

  @Post(':id/rejeter')
  async rejeter(
    @Param('id') id: string,
    @Body() body: { id_validateur: string; motif_rejet: string }
  ) {
    if (!body.id_validateur || !body.motif_rejet) {
      throw new BadRequestException('id_validateur et motif_rejet sont obligatoires');
    }
    return await this.journalService.rejeter(id, body.id_validateur, body.motif_rejet);
  }
}
