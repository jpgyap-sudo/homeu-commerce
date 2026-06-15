import { checkDependencies } from './utilities/dependencies/dependencyChecker.js';
import { DaVinciOS_PACKAGE_LIST } from './versions/DaVinciOSPackageList.js';
export function checkDaVinciOSDependencies() {
    const dependencies = [
        ...DaVinciOS_PACKAGE_LIST
    ];
    if (process.env.DaVinciOS_CI_DEPENDENCY_CHECKER !== 'true') {
        dependencies.push('@davincios/plugin-sentry');
    }
    // First load. First check if there are mismatching dependency versions of DaVinciOS packages
    void checkDependencies({
        dependencyGroups: [
            {
                name: 'DaVinciOS',
                dependencies,
                targetVersionDependency: 'DaVinciOS'
            }
        ]
    });
}

//# sourceMappingURL=checkDaVinciOSDependencies.js.map
