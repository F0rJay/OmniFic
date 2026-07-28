from pathlib import Path
import tomllib


def test_greenlet_is_a_direct_runtime_dependency() -> None:
    project_file = Path(__file__).parents[1] / "pyproject.toml"
    project = tomllib.loads(project_file.read_text(encoding="utf-8"))
    dependencies = project["project"]["dependencies"]

    assert any(dependency.startswith("greenlet>=") for dependency in dependencies)
