# Estrategia de Backups

La integridad de la información es vital. Se han establecido los siguientes procedimientos.

## Base de Datos (PostgreSQL)

Se incluye un script en `scripts/backup-db.sh`.

### Ejecución Manual
```bash
cd scripts
chmod +x backup-db.sh
./backup-db.sh
```

### Automatización (Cron)
Se recomienda configurar una tarea cron para realizar backups diarios:
```bash
0 2 * * * /path/to/project/scripts/backup-db.sh >> /var/log/folga-backup.log 2>&1
```

## Archivos (Documentos)
Los documentos se almacenan en **Supabase Storage**.
- Supabase ofrece backups automáticos en sus planes pagos.
- Se recomienda habilitar el versionado de objetos en el bucket de documentos.

## Recuperación (Disaster Recovery)
Para restaurar una base de datos:
```bash
psql -d <database_url> -f <backup_file.sql>
```
**Nota:** Asegúrate de que las variables de entorno coincidan antes de restaurar.
