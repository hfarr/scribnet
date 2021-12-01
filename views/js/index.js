'use strict'

import Center from './components/Center.js'
import Cluster from './components/Cluster.js'
import Cover from './components/Cover.js'
import Sidebar from './components/Sidebar.js'
import Stack from './components/Stack.js'

console.log("When modules are imported, they aren't invoked. But if the only thing in an imported module is imports of other modules, then it doesn't even show up in the browser sources!");
