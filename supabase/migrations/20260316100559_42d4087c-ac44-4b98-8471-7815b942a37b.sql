
-- 1. Reset 54 leads erroneamente assegnati ai venditori singoli con campagna "Evergreen - Mar26 #3"
UPDATE lead_generation
SET venditore = NULL, campagna = NULL, stato = 'nuovo', assignable = true, data_assegnazione = NULL
WHERE id IN (
  -- Matteo Petrucci (5)
  '11e4f3b3-9587-44a4-ac7d-0ff1f6a6f65a', '3544e3dd-376d-4fb5-b295-99f72225a0d2', '39c18fac-4b4b-4367-a4dc-0c57894c4e7e', '7d5145fb-5de9-41ec-bb9a-57c2ff3e02e4', 'f0396cc1-63b5-4c25-bfe3-ed158aaf9221',
  -- Rocco Alicchio (15)
  '232c2406-8049-4719-9db0-30eedefac020', '54f51344-f032-4ce1-9b5f-74cbce668d4a', '7bb0506b-b88b-4f4a-b157-308706becec3', '803985d4-a1dd-456d-9747-fafe0baec7ab', '8e00f1a5-86b1-4d74-843e-018a14ed3a37', '96240030-4a90-4ade-bc6d-0fdb9287c1f4', 'aa3ec294-f11b-41d3-a090-7cd14f2e4bc1', 'b3d10fa4-0e50-4fec-8059-707deb27d104', 'b5a341b7-2d81-4a33-8b92-faf9acbceba6', 'b5df81d2-7208-427c-96c7-59d99db9c54b', 'c62cf6ff-0117-4daa-a4f1-8c18aece3d9c', 'e5e87b0d-fb6b-4248-a112-570edf0285d3', 'e9faffdb-3dc5-4dd6-a25d-3054d98b4bca', 'fd6db0d5-3f51-4645-b4e7-e923dc65f7d4', 'fdcfd97d-175a-4c6f-89c5-5a1011ef8ba8',
  -- Veronica Dinga (5)
  '18d5f52b-35fc-4599-9a1e-a286c6517488', '1ad96d35-b74e-4965-8ea3-83e9641bd47e', 'a7a1747f-8943-47d6-823e-db6c61550528', 'b6f0a022-6456-4af7-8e2c-c50a1577d530', 'd8c71437-42c3-4f71-8ec1-0d7f73134ff8',
  -- Giovanni Bianucci (1)
  '3a3d37e4-b4df-4a7e-ab92-09d722e626b2',
  -- Desiree Masiero (8)
  '1da145d6-202b-4038-bf0e-83da541fc6b8', '3322ebb0-ca04-46ea-a85a-a2c4e397f467', '68d9a3fc-e062-4b40-8b37-a14f3a891369', '7e3853c6-e337-4cce-ab5a-3f7c4b8640d7', '8827f5c9-0c0e-406c-aa01-6732ba1da655', 'a2bdab7d-3b53-42b3-be3a-1508c9717065', 'beb91f81-84ac-4d2d-80ba-5b24349f0105', 'e6ff28f8-9b3f-4a7c-8006-598e78a2bf40',
  -- Raffaella Garatti (10)
  '043b10f8-b4b2-4baa-8eea-215ed88d424a', '56047c18-8932-4927-a59c-56534e5d745e', '86c16472-81dc-46b8-8a18-c2c806e06198', '90c16ed5-5fe1-4b53-9343-d36d0bac822d', '93544c7f-7872-4ac5-863f-472f682a77ba', 'ab4d3de9-5898-4b65-850b-1f1ef411b6f9', 'af599fec-1c33-4526-a28b-06f4706c4f1c', 'b11a8e3a-7e50-410c-aef7-68f55d1350f3', 'f5157d0e-9e24-4bcf-904a-87c7f052d6bf', 'f725acab-2fad-4308-a83c-a32fe0448bef',
  -- Francisco Girado (1)
  '340f7dcd-9283-432f-afd7-9dff76c05fe4',
  -- matteo petrucci (1)
  'd5bab7b1-679e-415c-a8a6-a8468d67955c',
  -- Giusy Faicchia (7)
  '051f18b5-08fc-4610-8f39-855747ecd76d', '14f58db6-857e-4bae-a08b-402c3ba8b860', '20c23bf3-a478-44e9-abc6-416bd8ac285d', '55ab853a-8d76-4c82-ae55-217125caac1a', '95ba4939-6598-47e0-9b9b-74a268ef355c', 'e71226d9-bf56-47b4-a71d-c74ef6d1ae85', 'fb84c666-0e71-4098-97d1-caeff53e013e',
  -- Stefania Rocco (1)
  '03a54602-e413-4ea5-b14f-278c04b9c9ad'
);

-- 2. Delete the 10 erroneous history entries (individual venditori with wrong campaign)
DELETE FROM assignment_history WHERE id IN (
  'a5b4f1c0-137e-4253-aca7-3bfa5f22d266',
  '263f3e39-e332-461f-88c2-ef0bc15b1416',
  'cfea3aa9-5f73-4085-9441-5f9b87af8a33',
  'b0118bf5-9e80-4657-b7e8-9b044b6495c2',
  '0f46e353-b846-4cc1-9d27-8441ee81a903',
  'a8fffaf5-9458-4d0b-955a-c616db1efbd0',
  '2e6912a8-0c7b-42e3-b145-0325ee4a1070',
  'd0ca546a-7003-4fa3-ad32-79d0cf075bc5',
  '823de082-af61-4478-b7d2-284a6aa27696',
  'f3d5a1ac-2c70-423d-a3b7-7fe267d50dbe'
);

-- 3. Delete the 9 fragmented CRM4 entries (will be replaced by 1 consolidated)
DELETE FROM assignment_history WHERE id IN (
  'aa9dd0b4-e2e8-4119-9d1d-c06d237578ec',
  '2ffd4b26-1de1-423f-8a8a-abf312a67a69',
  'c87a834d-98ff-4857-933c-622276f95fad',
  '9f287549-2127-4c13-874a-76001ab43640',
  '1e5087da-8dbf-4e9a-a77c-c0613c5b8db9',
  '4e71c68b-3ca7-4509-b28b-3941492ee35b',
  'b13e166c-1714-4d2a-bb36-0b04c856768f',
  '4c749c85-294e-40d8-b449-ea09cad04258',
  '72fa42dc-389c-4400-ac32-968757de5d6a'
);

-- 4. Insert 1 consolidated CRM4 entry with all 40 lead IDs
INSERT INTO assignment_history (venditore, leads_count, campagna, source_mode, bypass_time_interval, market, assignment_type, assigned_at, lead_ids)
VALUES (
  'CRM4 ',
  40,
  'Evergreen - Mar26 #3',
  'exclude',
  true,
  'IT',
  'manual',
  '2026-03-16 09:05:30.422046+00',
  ARRAY[
    '355920ef-0e9c-405a-9eb6-f182c1e386d8','3e5a80de-0761-4712-8ab5-8fbe246d3655','477fa13a-56ce-4b62-9510-23a802e3b31d','9407469a-bc28-4c8c-b1c3-661d055e5ec0','e066ff8d-93fa-41c5-b427-58287d1d6b37','f9cbd437-f57b-450a-bfb6-1a82a81dc043',
    '2ab20440-46bb-4552-8100-68c5d8fad86c','3024b86b-e9e8-430f-8509-004b283a7db7','b06a7396-4bb7-43b6-85fb-7829c975a653','d726f50d-28a4-4905-9ef5-86895f3a0984','d7cd8a19-c714-4433-ab8c-18961334b706','f42d8b82-7911-4b73-bde8-230c5f49643e','fbcb71d1-077d-4a6f-95d6-74b95316b7e9',
    '06b723bc-69ba-4c82-bd35-ed9aed7b1421','0ce23a91-20d3-40d4-b5f1-671e57b34a74','1ba6c271-7e4d-45bf-9b41-da9d94573008','464bbc3f-306f-4cc2-b4f9-92935569903c','59e801e7-85d8-477a-ad83-137e096e5ba7','5a84427f-9e34-4152-8e5c-15a50efae51e','80803a45-2c98-434e-8eb0-5fbcaad6b167','8562745b-4d5f-4c6d-922d-b1e04696447a','ab064ff0-a1a3-47e2-9297-653f2297cd07','b0d4200f-0693-49b2-b0f8-317a346e67c0','bba9f03d-0696-4613-a32c-6b83ce063601','c75df428-3528-4c6b-b0bc-b641dfb4c694','e6b99969-b8de-4686-a3de-a538117521da','ee403961-6d09-436e-b1ae-14f3aeb0d548','fb328f9e-5832-411b-ba90-9e81263f4b0e',
    '8a291bb9-8867-4ba2-824d-d1d2c2ad2a77','dba4da68-f7e2-4421-8791-72fb2e5b5664',
    '3ab48ded-591c-410c-a863-a2fa779ac413','b6bde0c2-d4b7-44bb-8984-37572f5b0dfd','f86ee5a7-c377-4819-894a-fc616e2be84b',
    'c7133118-e736-4b1b-be3c-728ffabdb70a','ecbe0139-16ac-4a82-9023-db56fdf9da85',
    '2373e9e1-efb7-419c-8f2c-e20a7020540b','53832716-a6d8-49c5-a685-182e7e65a91f','72b1d730-2394-4683-8207-c5b010dbc6c0',
    'f1daf8f9-a730-4eb2-baf3-5759a4989de9',
    '98713ad7-597c-421b-91f7-0078c3be78ae'
  ]::uuid[]
);
