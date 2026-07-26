# 数据库迁移操作

## 查看当前版本

```bash
cd backend
alembic -c alembic.ini current
```

## 升级到最新

```bash
alembic -c alembic.ini upgrade head
```

## 回滚一步

```bash
alembic -c alembic.ini downgrade -1
```

## 新建迁移

```bash
alembic -c alembic.ini revision -m "描述"
```

迁移文件在 `backend/app/storage/migrations/versions/`。

手动编辑迁移文件后运行 `upgrade head` 以应用。

## 注意事项

- SQLite 使用 `batch_alter_table` 模式（`with op.batch_alter_table("table_name") as batch_op:`）
- 新增字段设 `nullable=True`，避免数据迁移失败
- 回滚脚本必须提供 `downgrade()` 并测试通过
