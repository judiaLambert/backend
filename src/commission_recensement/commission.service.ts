import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRecensement } from './commission.entity';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionRecensement)
    private commissionRepository: Repository<CommissionRecensement>,
  ) {}

  async generateId(): Promise<string> {
    const lastCommission = await this.commissionRepository
      .createQueryBuilder('commission')
      .orderBy('commission.id', 'DESC')
      .limit(1)
      .getOne();

    if (!lastCommission) {
      return 'COM001';
    }

    const lastNumber = parseInt(lastCommission.id.replace('COM', ''));
    const newNumber = lastNumber + 1;
    return `COM${newNumber.toString().padStart(3, '0')}`;
  }

  async create(
    date_commission: Date,
    membre_commission: string,
    president: string,
    lieu_commission: string,
  ) {
    if (!membre_commission || membre_commission.trim().length === 0) {
      throw new BadRequestException('Les membres de la commission sont obligatoires');
    }

    if (!president || president.trim().length === 0) {
      throw new BadRequestException('Le président est obligatoire');
    }

    if (!lieu_commission || lieu_commission.trim().length === 0) {
      throw new BadRequestException('Le lieu est obligatoire');
    }

    const id = await this.generateId();

    const commission = this.commissionRepository.create({
      id,
      date_commission,
      membre_commission,
      president,
      lieu_commission,
    });

    return await this.commissionRepository.save(commission);
  }

  async findAll() {
    return await this.commissionRepository.find({
      order: { date_commission: 'DESC' },
    });
  }

  async findOne(id: string) {
    const commission = await this.commissionRepository.findOne({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${id} non trouvée`);
    }

    return commission;
  }

  async update(
    id: string,
    updateData: {
      date_commission?: Date;
      membre_commission?: string;
      president?: string;
      lieu_commission?: string;
    },
  ) {
    const commission = await this.findOne(id);

    if (updateData.membre_commission !== undefined && updateData.membre_commission.trim().length === 0) {
      throw new BadRequestException('Les membres de la commission sont obligatoires');
    }

    if (updateData.president !== undefined && updateData.president.trim().length === 0) {
      throw new BadRequestException('Le président est obligatoire');
    }

    if (updateData.lieu_commission !== undefined && updateData.lieu_commission.trim().length === 0) {
      throw new BadRequestException('Le lieu est obligatoire');
    }

    await this.commissionRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string) {
    const commission = await this.findOne(id);
    return await this.commissionRepository.delete(id);
  }

  async getStatistiques() {
    const total = await this.commissionRepository.count();

    const aujourd_hui = new Date();
    const debutMois = new Date(aujourd_hui.getFullYear(), aujourd_hui.getMonth(), 1);

    const ceMois = await this.commissionRepository
      .createQueryBuilder('commission')
      .where('commission.date_commission >= :debut', { debut: debutMois })
      .getCount();

    const prochaine = await this.commissionRepository
      .createQueryBuilder('commission')
      .where('commission.date_commission > :maintenant', { maintenant: aujourd_hui })
      .orderBy('commission.date_commission', 'ASC')
      .getOne();

    return {
      total,
      ceMois,
      prochaine,
    };
  }
}
