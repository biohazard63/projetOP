import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extensionFamily, extensionFamilies } from '../src/lib/collector/extension-family'
test('extension families accept real hyphenated and compact codes without guessing unknown labels',()=>{
 assert.equal(extensionFamily('OP-05'),'OP')
 assert.equal(extensionFamily('eb01'),'EB')
 assert.equal(extensionFamily('ST-28'),'ST')
 assert.equal(extensionFamily('PRB-01'),'PRB')
 assert.equal(extensionFamily('PROMO'),'Autres')
})
test('families reflect only catalogue entries, deduplicated and ordered',()=>{
 assert.deepEqual(extensionFamilies(['ST-01','OP01','OP-02','EB-01','PROMO']),['OP','EB','ST','Autres'])
 assert.deepEqual(extensionFamilies([]),[])
})
