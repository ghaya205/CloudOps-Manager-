import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
  ADMIN = 'ADMIN',
  DEVOPS = 'DEVOPS',
  VIEWER = 'VIEWER',
}
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') //a unique id generated automativally
  id!: string;
  @Column({ unique: true })//two users can’t share an email.
  email!: string;
  @Column()//stored as a hash.
  password!: string;
  @Column()
  firstName!: string;
  @Column()
  lastName!: string;
  @Column({ type: 'enum', enum: Role, default: Role.VIEWER })
  role!: Role;
  @CreateDateColumn()//filled automatically on creation.
  createdAt!: Date;
}