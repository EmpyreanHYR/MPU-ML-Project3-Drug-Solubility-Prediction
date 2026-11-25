"""Load contributor-owned implementations and previously serialized model names."""
from pathlib import Path
import sys
import importlib.abc
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
IMPLEMENTATIONS = {'scripts/export_combination_variants.py': 'yuchunshen/export_combination_variants.py',
 'scripts/export_tabpfn_combination_v3.py': 'yuchunshen/export_tabpfn_combination_v3.py',
 'scripts/launch_studio.py': 'hehaoyang/launch_studio.py',
 'scripts/pilots/pair_pilot/analyze_pair_pilot.py': 'yuchunshen/pilots/pair_pilot/analyze_pair_pilot.py',
 'scripts/pilots/pair_pilot/run_pair_pilot.py': 'yuchunshen/pilots/pair_pilot/run_pair_pilot.py',
 'scripts/pilots/tabpfn_balancing_pilot/run_balancing_pilot.py': 'yuchunshen/pilots/tabpfn_balancing_pilot/run_balancing_pilot.py',
 'scripts/pilots/tabpfn_cpu_probe/run_cpu_probe.py': 'yuchunshen/pilots/tabpfn_cpu_probe/run_cpu_probe.py',
 'scripts/pilots/tabpfn_probe/run_probe.py': 'yuchunshen/pilots/tabpfn_probe/run_probe.py',
 'scripts/predict_combination_v3.py': 'yuchunshen/predict_combination_v3.py',
 'scripts/revision_diagnostics.py': 'huangyaorong/revision_diagnostics.py',
 'scripts/run_adaptive_revision.py': 'huangyaorong/run_adaptive_revision.py',
 'scripts/run_baselines.py': 'songjiayun/run_baselines.py',
 'scripts/run_combination_nested.py': 'yuchunshen/run_combination_nested.py',
 'scripts/run_combination_pilot.py': 'yuchunshen/run_combination_pilot.py',
 'scripts/run_experiments.py': 'songjiayun/run_experiments.py',
 'scripts/run_revision.py': 'songjiayun/run_revision.py',
 'scripts/run_tabpfn_combination_v3.py': 'yuchunshen/run_tabpfn_combination_v3.py',
 'src/experimental_pair_v3/pair_models.py': 'yuchunshen/experimental_pair_v3/pair_models.py',
 'src/experimental_tabpfn_v3/adapter.py': 'yuchunshen/experimental_tabpfn_v3/adapter.py',
 'src/experimental_v3/ensemble.py': 'yuchunshen/experimental_v3/ensemble.py',
 'src/experimental_v3/kernel_models.py': 'yuchunshen/experimental_v3/kernel_models.py',
 'src/experimental_v3/tree_models.py': 'yuchunshen/experimental_v3/tree_models.py',
 'src/models/conditional_common.py': 'huangyaorong/models/conditional_common.py',
 'src/models/dummy_model.py': 'songjiayun/models/dummy_model.py',
 'src/models/extra_trees_model.py': 'songjiayun/models/extra_trees_model.py',
 'src/models/hist_gradient_boosting_model.py': 'songjiayun/models/hist_gradient_boosting_model.py',
 'src/models/hybrid_conditional_model.py': 'huangyaorong/models/hybrid_conditional_model.py',
 'src/models/interaction_conditional_model.py': 'huangyaorong/models/interaction_conditional_model.py',
 'src/models/plain_mlp_model.py': 'huangyaorong/models/plain_mlp_model.py',
 'src/models/random_forest_model.py': 'songjiayun/models/random_forest_model.py',
 'src/models/realmlp_model.py': 'songjiayun/models/realmlp_model.py',
 'src/models/ridge_model.py': 'songjiayun/models/ridge_model.py',
 'src/models/tabm_model.py': 'songjiayun/models/tabm_model.py',
 'src/models/temperature_mlp_model.py': 'huangyaorong/models/temperature_mlp_model.py',
 'src/revision_models/adaptive_hybrid_model.py': 'huangyaorong/revision_models/adaptive_hybrid_model.py',
 'webapp/server.py': 'hehaoyang/webapp/server.py'}


IMPLEMENTATIONS.update({'src/experimental_v3/__init__.py': 'yuchunshen/experimental_v3/__init__.py', 'src/experimental_pair_v3/__init__.py': 'yuchunshen/experimental_pair_v3/__init__.py', 'src/revision_models/__init__.py': 'huangyaorong/revision_models/__init__.py'})

def source_path(path):
    path = Path(path)
    try:
        relative = str(path.relative_to(ROOT))
    except ValueError:
        return path
    return ROOT / IMPLEMENTATIONS.get(relative, relative)


def execute(logical_path, namespace):
    """Retain public module names and repository-relative resource locations."""
    source = ROOT / IMPLEMENTATIONS[logical_path]
    logical = ROOT / logical_path
    namespace['__file__'] = str(logical)
    sys.path.insert(0, str(ROOT / 'scripts'))
    text = source.read_text()
    text = text.replace('from pathlib import Path',
                        'from src.ownership import SourcePath as Path')
    lines = []
    for line in text.splitlines(keepends=True):
        lines.append(line)
        if line.startswith('from src.data import ') and 'ROOT' in line:
            lines.append('from src.ownership import SourcePath as _SourcePath\nROOT = _SourcePath(ROOT)\n')
    exec(compile(''.join(lines), str(source), 'exec'), namespace)


class SourcePath(type(Path())):
    """Read implementation bytes when existing code inspects a public entrypoint."""
    def read_bytes(self):
        return Path(source_path(self)).read_bytes()


    def glob(self, pattern, **kwargs):
        # Existing training bookkeeping enumerates the former source layout.
        # Yield logical names while reading their single physical implementation.
        yielded = set()
        for path in super().glob(pattern, **kwargs):
            yielded.add(path)
            yield path
        for logical in IMPLEMENTATIONS:
            path = SourcePath(ROOT / logical)
            if path.parent == self and path.match(pattern) and path not in yielded:
                yield path


_MODULES = {old[:-3].replace('/', '.'): old
            for old in IMPLEMENTATIONS if old.startswith('src/')}
_MODULES.update({Path(old).stem: old for old in IMPLEMENTATIONS
                 if old.startswith('scripts/') and len(Path(old).parts) == 2})
_PACKAGES = {name.rsplit('.', 1)[0] for name in _MODULES if '.' in name}


class _OwnedLoader(importlib.abc.Loader):
    def create_module(self, spec):
        return None

    def exec_module(self, module):
        logical = _MODULES.get(module.__name__)
        if logical is not None:
            execute(logical, module.__dict__)


class _OwnedFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname in _MODULES:
            return importlib.util.spec_from_loader(fullname, _OwnedLoader(),
                origin=str(ROOT / IMPLEMENTATIONS[_MODULES[fullname]]))
        if fullname in _PACKAGES and not (ROOT / fullname.replace('.', '/') / '__init__.py').exists():
            return importlib.util.spec_from_loader(fullname, _OwnedLoader(), is_package=True)
        return None


def install():
    """Resolve legacy estimator names without retaining old source files."""
    if not any(isinstance(finder, _OwnedFinder) for finder in sys.meta_path):
        sys.meta_path.insert(0, _OwnedFinder())
