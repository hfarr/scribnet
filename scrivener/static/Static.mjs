'use strict'
import express from 'express'
import path from 'path'

export function staticLocation(rootPath) {
  return dir => staticApp(path.join(rootPath, dir))
}

export default function staticApp(file_path) {
  return express.static(file_path)
}
