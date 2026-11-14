data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  create_private_network = length(var.private_subnet_ids) == 0
  private_subnet_ids     = local.create_private_network ? aws_subnet.private[*].id : var.private_subnet_ids
}

resource "aws_subnet" "private" {
  count             = local.create_private_network ? 2 : 0
  vpc_id            = data.aws_vpc.selected.id
  availability_zone = data.aws_availability_zones.available.names[count.index]
  cidr_block        = cidrsubnet(data.aws_vpc.selected.cidr_block, 8, 128 + count.index)
  tags              = merge(local.tags, { Name = "${local.name}-private-${count.index + 1}" })
}

resource "aws_eip" "nat" {
  count  = local.create_private_network ? 1 : 0
  domain = "vpc"
  tags   = merge(local.tags, { Name = "${local.name}-nat" })
}

resource "aws_nat_gateway" "main" {
  count         = local.create_private_network ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = sort(data.aws_subnets.selected.ids)[0]
  tags          = merge(local.tags, { Name = "${local.name}-nat" })
}

resource "aws_route_table" "private" {
  count  = local.create_private_network ? 1 : 0
  vpc_id = data.aws_vpc.selected.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[0].id
  }
  tags = merge(local.tags, { Name = "${local.name}-private" })
}

resource "aws_route_table_association" "private" {
  count          = local.create_private_network ? 2 : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

resource "aws_security_group" "services" {
  name        = "${local.name}-services"
  description = "Baydar application and database connectivity"
  vpc_id      = data.aws_vpc.selected.id

  ingress {
    from_port   = 3000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}
