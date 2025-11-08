import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { DemandeMaterielService } from '../demande_materiel/demande.service';
import { DemandeMateriel } from '../demande_materiel/demande.entity';

@Controller('demande-materiel')
export class DemandeMaterielController {
  constructor(private readonly demandeMaterielService: DemandeMaterielService) {}

  @Get()
  async getAll(): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielService.findAll();
  }

  @Get('demandeur/:idDemandeur')
  async getByDemandeur(@Param('idDemandeur') idDemandeur: string): Promise<DemandeMateriel[]> {
    return await this.demandeMaterielService.findByDemandeur(idDemandeur);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.findOne(id);
  }

  @Post()
  async create(@Body() demandeData: {
    id_demandeur: string;
    date_demande: string;
    raison_demande: string;
  }): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.create(
      demandeData.id_demandeur,
      new Date(demandeData.date_demande),
      demandeData.raison_demande
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: {
      id_demandeur: string;
      date_demande: string;
      raison_demande: string;
    },
  ): Promise<DemandeMateriel> {
    return await this.demandeMaterielService.update(
      id,
      updateData.id_demandeur,
      new Date(updateData.date_demande),
      updateData.raison_demande
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.demandeMaterielService.remove(id);
    return { message: 'Demande supprimée avec succès' };
  }
}