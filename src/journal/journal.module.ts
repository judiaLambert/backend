import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Journal } from './journal.entity';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { GrandLivreModule } from 'src/grand_livre/livre.module';

@Module({
  imports: [TypeOrmModule.forFeature([Journal]),GrandLivreModule],
  providers: [JournalService],
  controllers: [JournalController],
  exports: [JournalService], 
})
export class JournalModule {}

