<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260928020516 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Index webhook events by reception time, for the retention sweep.';
    }

    public function up(Schema $schema): void
    {
        $this->skipIf(!$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform, 'PostgreSQL only.');
        $this->addSql('CREATE INDEX webhook_events_received_at ON webhook_events (received_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX webhook_events_received_at');
    }
}
