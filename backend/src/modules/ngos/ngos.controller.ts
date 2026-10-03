import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';

import { CreateNgoDto, UpdateNgoDto } from './dto/create-ngo.dto';
import { NgosService } from './ngos.service';

@ApiTags('ngos')
@ApiBearerAuth()
@Controller('ngos')
export class NgosController {
  constructor(private readonly ngosService: NgosService) {}

  @Get()
  @ApiOperation({ summary: 'FR11 — active partner organisations' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.ngosService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ngosService.findById(id);
  }

  @Post()
  @Roles(Role.Admin)
  create(@Body() dto: CreateNgoDto) {
    return this.ngosService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateNgoDto) {
    return this.ngosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Deactivate rather than delete, to keep historical references' })
  deactivate(@Param('id') id: string) {
    return this.ngosService.deactivate(id);
  }
}
