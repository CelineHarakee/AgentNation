# rag/kg_data.py
# Static data that seeds the Knowledge Graph.
# Reflects Saudi Arabian sector workforce structure as of Vision 2030 targets.

KG_SECTORS = {
    "healthcare": {
        "workforce_types": ["physicians", "nurses", "medical_technicians", "healthcare_admin"],
        "budget_billions_sar": 180,
        "saudization_target": 0.35,
    },
    "education": {
        "workforce_types": ["teachers", "university_faculty", "education_admin", "support_staff"],
        "budget_billions_sar": 220,
        "saudization_target": 0.75,
    },
    "technology": {
        "workforce_types": ["software_engineers", "data_scientists", "it_managers", "cybersecurity"],
        "budget_billions_sar": 95,
        "saudization_target": 0.30,
    },
    "construction": {
        "workforce_types": ["civil_engineers", "project_managers", "skilled_laborers", "supervisors"],
        "budget_billions_sar": 320,
        "saudization_target": 0.10,
    },
    "finance": {
        "workforce_types": ["financial_analysts", "bankers", "compliance_officers", "operations"],
        "budget_billions_sar": 60,
        "saudization_target": 0.70,
    },
    "tourism": {
        "workforce_types": ["hospitality_workers", "tour_guides", "tourism_managers", "travel_agents"],
        "budget_billions_sar": 75,
        "saudization_target": 0.50,
    },
    "manufacturing": {
        "workforce_types": ["production_operators", "manufacturing_engineers", "quality_control", "logistics"],
        "budget_billions_sar": 110,
        "saudization_target": 0.25,
    },
    "energy": {
        "workforce_types": ["petroleum_engineers", "energy_technicians", "plant_operators", "energy_managers"],
        "budget_billions_sar": 400,
        "saudization_target": 0.65,
    },
}

KG_WORKFORCE_TYPES = {
    "physicians": {
        "capacity": 80000,
        "annual_training_output": 3500,
        "avg_salary_sar": 350000,
        "training_years": 6,
    },
    "nurses": {
        "capacity": 170000,
        "annual_training_output": 8500,
        "avg_salary_sar": 120000,
        "training_years": 3,
    },
    "medical_technicians": {
        "capacity": 45000,
        "annual_training_output": 4000,
        "avg_salary_sar": 90000,
        "training_years": 2,
    },
    "healthcare_admin": {
        "capacity": 35000,
        "annual_training_output": 5000,
        "avg_salary_sar": 75000,
        "training_years": 2,
    },
    "teachers": {
        "capacity": 400000,
        "annual_training_output": 20000,
        "avg_salary_sar": 85000,
        "training_years": 4,
    },
    "university_faculty": {
        "capacity": 80000,
        "annual_training_output": 5000,
        "avg_salary_sar": 180000,
        "training_years": 8,
    },
    "education_admin": {
        "capacity": 60000,
        "annual_training_output": 8000,
        "avg_salary_sar": 70000,
        "training_years": 2,
    },
    "support_staff": {
        "capacity": 60000,
        "annual_training_output": 10000,
        "avg_salary_sar": 45000,
        "training_years": 1,
    },
    "software_engineers": {
        "capacity": 50000,
        "annual_training_output": 8000,
        "avg_salary_sar": 180000,
        "training_years": 4,
    },
    "data_scientists": {
        "capacity": 15000,
        "annual_training_output": 3000,
        "avg_salary_sar": 200000,
        "training_years": 4,
    },
    "it_managers": {
        "capacity": 20000,
        "annual_training_output": 4000,
        "avg_salary_sar": 220000,
        "training_years": 5,
    },
    "cybersecurity": {
        "capacity": 12000,
        "annual_training_output": 2500,
        "avg_salary_sar": 210000,
        "training_years": 4,
    },
    "civil_engineers": {
        "capacity": 120000,
        "annual_training_output": 8000,
        "avg_salary_sar": 120000,
        "training_years": 4,
    },
    "project_managers": {
        "capacity": 80000,
        "annual_training_output": 5000,
        "avg_salary_sar": 150000,
        "training_years": 5,
    },
    "skilled_laborers": {
        "capacity": 2500000,
        "annual_training_output": 30000,
        "avg_salary_sar": 35000,
        "training_years": 1,
    },
    "supervisors": {
        "capacity": 200000,
        "annual_training_output": 7000,
        "avg_salary_sar": 80000,
        "training_years": 2,
    },
    "financial_analysts": {
        "capacity": 25000,
        "annual_training_output": 3000,
        "avg_salary_sar": 175000,
        "training_years": 4,
    },
    "bankers": {
        "capacity": 35000,
        "annual_training_output": 4000,
        "avg_salary_sar": 140000,
        "training_years": 4,
    },
    "compliance_officers": {
        "capacity": 12000,
        "annual_training_output": 2000,
        "avg_salary_sar": 160000,
        "training_years": 4,
    },
    "operations": {
        "capacity": 18000,
        "annual_training_output": 3000,
        "avg_salary_sar": 90000,
        "training_years": 2,
    },
    "hospitality_workers": {
        "capacity": 180000,
        "annual_training_output": 15000,
        "avg_salary_sar": 45000,
        "training_years": 1,
    },
    "tour_guides": {
        "capacity": 25000,
        "annual_training_output": 3000,
        "avg_salary_sar": 65000,
        "training_years": 1,
    },
    "tourism_managers": {
        "capacity": 30000,
        "annual_training_output": 4000,
        "avg_salary_sar": 120000,
        "training_years": 3,
    },
    "travel_agents": {
        "capacity": 20000,
        "annual_training_output": 2500,
        "avg_salary_sar": 60000,
        "training_years": 1,
    },
    "production_operators": {
        "capacity": 400000,
        "annual_training_output": 12000,
        "avg_salary_sar": 50000,
        "training_years": 1,
    },
    "manufacturing_engineers": {
        "capacity": 80000,
        "annual_training_output": 6000,
        "avg_salary_sar": 130000,
        "training_years": 4,
    },
    "quality_control": {
        "capacity": 60000,
        "annual_training_output": 4000,
        "avg_salary_sar": 95000,
        "training_years": 2,
    },
    "logistics": {
        "capacity": 80000,
        "annual_training_output": 5000,
        "avg_salary_sar": 70000,
        "training_years": 2,
    },
    "petroleum_engineers": {
        "capacity": 25000,
        "annual_training_output": 2000,
        "avg_salary_sar": 280000,
        "training_years": 4,
    },
    "energy_technicians": {
        "capacity": 20000,
        "annual_training_output": 2500,
        "avg_salary_sar": 120000,
        "training_years": 2,
    },
    "plant_operators": {
        "capacity": 15000,
        "annual_training_output": 2000,
        "avg_salary_sar": 95000,
        "training_years": 2,
    },
    "energy_managers": {
        "capacity": 8000,
        "annual_training_output": 1000,
        "avg_salary_sar": 230000,
        "training_years": 5,
    },
}

KG_TRAINING_INSTITUTIONS = {
    "King_Saud_University": {
        "annual_output": 12000,
        "trains_workforce_types": ["software_engineers", "data_scientists", "physicians", "civil_engineers"],
    },
    "King_Abdulaziz_University": {
        "annual_output": 10000,
        "trains_workforce_types": ["financial_analysts", "it_managers", "university_faculty"],
    },
    "Saudi_Health_Council_Training": {
        "annual_output": 8000,
        "trains_workforce_types": ["nurses", "medical_technicians", "healthcare_admin"],
    },
    "Technical_and_Vocational_Training_Corporation": {
        "annual_output": 25000,
        "trains_workforce_types": [
            "skilled_laborers", "production_operators", "energy_technicians",
            "hospitality_workers", "logistics"
        ],
    },
    "HRDF_Training_Programs": {
        "annual_output": 15000,
        "trains_workforce_types": [
            "tour_guides", "tourism_managers", "travel_agents", "quality_control", "supervisors"
        ],
    },
    "King_Abdullah_University_KAUST": {
        "annual_output": 3000,
        "trains_workforce_types": ["petroleum_engineers", "energy_managers", "data_scientists"],
    },
}
