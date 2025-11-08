import {Module} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { connexionConfig } from './connexion.config';

@Module({
    imports: [TypeOrmModule.forRoot(connexionConfig)]
})
export class connexionModule{}